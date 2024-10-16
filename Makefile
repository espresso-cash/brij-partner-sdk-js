generate_protos:
	mkdir -p ./src/generated && \
	protoc --plugin=protoc-gen-ts_proto=./node_modules/.bin/protoc-gen-ts_proto \
       --ts_proto_out=./src/generated \
       --ts_proto_opt=esModuleInterop=true \
       --proto_path= ./protos/data.proto